package org.springframework.samples.petclinic.owner

import java.util.Map
import java.util.Optional
import org.springframework.stereotype.Controller
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping

@Controller
open class VisitController(
    private val owners: OwnerRepository
) {

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("visit")
    fun loadPetWithVisit(ownerId: Int, petId: Int, model: Map<String, Any>): Visit {
        val optionalOwner = owners.findById(ownerId)
        if (!optionalOwner.isPresent) throw IllegalArgumentException(
            "Owner not found with id: $ownerId. Please ensure the ID is correct"
        )
        val owner = optionalOwner.get()

        // Now getPet method — I don't know what it does, but we have to call it.
        val pet = owner.getPet(petId)

        model["pet"] = pet
        model["owner"] = owner

        val visit = Visit()
        return visit
    }

    @GetMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun initNewVisitForm() = "pets/createOrUpdateVisitForm"

    @PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun processNewVisitForm(
        owner: Owner,
        petId: Int,
        visit: Visit,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            return "pets/createOrUpdateVisitForm"
        }

        // Here, we are using the owner parameter — but note that in Java it was:
        //   public String processNewVisitForm(@ModelAttribute Owner owner, ...) 
        // So this is correct.

        // Also, note: The method has a parameter named petId (from @PathVariable) and also uses it to call getPet.
        // But wait — the original loadPetWithVisit already called getPet(petId). In processNewVisitForm, we are calling:
        //   owner.addVisit(petId, visit)
        // This is okay.

        owner.addVisit(petId, visit)

        owners.save(owner)  // Note: this.owners in Java

        redirectAttributes.addFlashAttribute("message", "Your visit has been booked")
        return "redirect:/owners/${owner.id}"
    }
}