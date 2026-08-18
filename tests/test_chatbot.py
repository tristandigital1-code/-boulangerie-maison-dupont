import pytest
from agent.chatbot import BoulangerieAgent


@pytest.fixture
def agent():
    return BoulangerieAgent()


def test_salutation(agent):
    reponse = agent.repondre("Bonjour")
    assert "Boulangerie Maison Dupont" in reponse
    assert "assistant" in reponse.lower()


def test_horaires(agent):
    reponse = agent.repondre("Quels sont vos horaires ?")
    assert "lundi" in reponse.lower() or "Lundi" in reponse
    assert "6h30" in reponse or "7h00" in reponse


def test_produit_specifique(agent):
    reponse = agent.repondre("baguette tradition")
    assert "1.30" in reponse
    assert "levain" in reponse.lower()


def test_prix(agent):
    reponse = agent.repondre("combien coute le croissant")
    assert "1.40" in reponse


def test_categorie_pains(agent):
    reponse = agent.repondre("montrez-moi vos pains")
    assert "Pain de campagne" in reponse
    assert "Pain complet" in reponse


def test_categorie_viennoiseries(agent):
    reponse = agent.repondre("vos viennoiseries")
    assert "Croissant" in reponse
    assert "Pain au chocolat" in reponse


def test_livraison(agent):
    reponse = agent.repondre("faites-vous la livraison ?")
    assert "livraison" in reponse.lower()
    assert "15" in reponse or "30" in reponse


def test_commande(agent):
    reponse = agent.repondre("comment commander ?")
    assert "01 42 61 00 00" in reponse or "commande" in reponse.lower()


def test_contact(agent):
    reponse = agent.repondre("quelle est votre adresse ?")
    assert "12 Rue de la Paix" in reponse
    assert "01 42 61 00 00" in reponse


def test_menu(agent):
    reponse = agent.repondre("quel est votre menu ?")
    assert "Pains" in reponse
    assert "Viennoiseries" in reponse


def test_au_revoir(agent):
    reponse = agent.repondre("au revoir")
    assert "bientot" in reponse.lower() or "journee" in reponse.lower() or "soiree" in reponse.lower()


def test_remerciement(agent):
    reponse = agent.repondre("merci beaucoup")
    assert "plaisir" in reponse.lower() or "prie" in reponse.lower() or "boulangerie" in reponse.lower()


def test_message_vide(agent):
    reponse = agent.repondre("")
    assert "compris" in reponse.lower() or "aider" in reponse.lower()


def test_message_inconnu(agent):
    reponse = agent.repondre("xyzabc123")
    assert len(reponse) > 0


def test_historique(agent):
    agent.repondre("Bonjour")
    assert len(agent.historique) == 2
    assert agent.historique[0]["role"] == "client"
    assert agent.historique[1]["role"] == "agent"


def test_allergie(agent):
    reponse = agent.repondre("je suis allergique au gluten")
    assert "allergie" in reponse.lower() or "gluten" in reponse.lower()


def test_parking(agent):
    reponse = agent.repondre("ou se garer ?")
    assert "parking" in reponse.lower() or "metro" in reponse.lower() or "Opera" in reponse
